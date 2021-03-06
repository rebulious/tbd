const neo4j = require('neo4j-driver').v1;
const _ = require('lodash');
const stringifyObject = require('stringify-object');
const { contractorHasNecessaryProps, extractNodes } = require('./databaseUtilities');
const { startUpScript, massDelete } = require('./startUpCypherScript')

class GraphApi {

  constructor(username, password, connection = "bolt://localhost") {
    this.driver = neo4j.driver(connection, neo4j.auth.basic(username, password));

    console.log('in constructor')
    // const session = this.driver.session();
    // session
    //   .run(massDelete)
    //   .then(result => {
    //     return session
    //       .run(startUpScript)
    //   })
    //   .then(result => {
    //   })
  }

  closeDriver() {
    this.driver.close();
  }


  createContractor(emplObj) {
    
    const session = this.driver.session();
    return session
      .run(`
        CREATE (e:Contractor ${stringifyObject(emplObj)})
        RETURN e
      `)
      .then(result => {
        const { records } = result;
        return extractNodes(records);
      })
  }

  getContractorByEmail(email) {
    const session = this.driver.session();
    console.log('in getContractor')

    return session
      .run(`
        MATCH (e:Contractor { email:"${email}" })
        RETURN e
      `)
      .then(({ records }) => {
        session.close()
        if (_.isEmpty(records)) {
          return null
        } else {
          return extractNodes(records)[0]
        }
      });
  }

  getContractorSkills(identity) {
    const session = this.driver.session();
    return session
      .run(`
        MATCH (c:Contractor) WHERE ID(c) = ${identity}
        MATCH (c)-[:HAS_SKILL_INSTANCE]->(skillInstance)
        RETURN skillInstance
      `)
      .then(({records}) => {
        return extractNodes(records);
      })
      .catch(err => {
        console.error(err);
      })
  }

  addSkillToContractor(identity, skill) {
    const session = this.driver.session();

    return session
      .run(`
        MATCH (c:Contractor) WHERE ID(c) = ${identity}
        MATCH (parentSkill:Skill { name: "${skill.name}" })
        CREATE (skill:SkillInstance ${stringifyObject(skill)})-[:INSTANCE_OF]->(parentSkill),
        (c)-[:HAS_SKILL_INSTANCE]->(skill)
        RETURN skill 
      `)
      .then(({ records }) => {
        session.close();
        return extractNodes(records);
      })
      .catch(err => {
        console.error(err)
      })
  }

  getContractorCertifications(identity) {
    const session = this.driver.session();
    return session
      .run(`
        MATCH (c:Contractor) WHERE ID(c) = ${identity}
        MATCH (c)-[:HAS_CERTIFICATION_INSTANCE]->(certInstance)
        RETURN certInstance
      `)
      .then(({records}) => {
        session.close();
        return extractNodes(records);
      })
      .catch(err => {
        console.error(err);
      })
  }

  addContractorCertification(identity, certification) {
    const session = this.driver.session();
    console.log(certification);
    return session
      .run(`
        MATCH (c:Contractor) WHERE ID(c) = ${identity}
        MATCH (parentCert:Certification { name: "${certification.name}" })
        CREATE (cert:CertificationInstance ${stringifyObject(certification)})-[:INSTANCE_OF]->(parentCert),
        (c)-[:HAS_CERTIFICATION_INSTANCE]->(cert)
        RETURN cert
      `)
      .then((result) => {
        const { records } = result
        session.close();
        return extractNodes(records);
      })
      .catch(err => {
        console.error(err)
      })

  }
}

module.exports = GraphApi;

